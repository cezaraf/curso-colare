const SolicitacaoControlador = ($scope, $http, TokenService, SolicitacaoRepository) => {

    /**
     * DEFINE AS MENSAGENS QUE SERÃO GERADAS PELO COLARE
     */
    $scope.mensagens = [];

    /**
     * DEFINE O PADRÃO DE EXPRESSÃO REGULAR PARA VALORES NUMÉRICOS
     */
    $scope.onlyNumbers = /^\d+$/;

    /**
     * DEFINE OS VALORES VÁLIDOS PARA A TABELA DE DOMÍNIO
     */
    $scope.codTipoSolicitacaoList = [

        { codigo: 1, descricao: 'APOSENTADORIA' },

        { codigo: 2, descricao: 'PENSÃO' }

    ];

    /**
     * SOLICITAÇÕES ENVIADAS AO COLARE
     */
    $scope.solicitacoes = [];

    /**
     * CRIA O OBJETO DE SOLICITAÇÃO
     */
    $scope.solicitacao = {};

    /**
     * CRIANDO O OBJETO DE FUNÇÃO
     */
    $scope.funcao = {};

    /**
     * DEFINE A REGRA DE INICIALIZAÇÃO DO TELA
     */
    let inicializarTela = () => {

        TokenService.checkTokenOnInit()
            
            .then((isToken) => $scope.$apply(() => $scope.tokenValido = isToken));

        carregarSolicitacoes();
    }

    /**
     * INICIAR OBJETO DE SOLICITAÇÃO (VAZIO)
     */
    let iniciarSolicitacao = () => $scope.solicitacao = {};

    /**
     * CARREGAR AS SOLICITAÇÕES ARMAZENADAS NO BROWSER
     */
    let carregarSolicitacoes = () => {

        SolicitacaoRepository.listar()

            .then((solicitacoes) => $scope.$apply(() => $scope.solicitacoes = solicitacoes));
    }

    /**
     * FECHAR ALERTA
     */
    $scope.fecharAlerta = (indice) => {

        jQuery(`.alert_${indice}`).alert('close');
    }

    /**
     * REALIZA O UPLOAD DOS ARQUIVOS NO COLARE
     */
    $scope.upload = (arquivos) => {

        // DEFINE O OBJETO FORM-DATA
        let formData = new FormData();

        // ADICIONA O ITEM ARQUIVO
        formData.append("arquivo", arquivos[0]);

        // REALIZA A CONFIGURAÇÃO DE AUTORIZAÇÃO COM O TOKEN
        let configuracao = { 
            
            headers: { 
                
                'Content-Type': undefined,

                'Authorization': TokenService.getTokenValue()
            } 
        };

        // ENVIA O ARQUIVO SELECIONADO PARA O COLARE
        $http.post(ENVIRONMENT['URL_UPLOAD_ARQUIVO'], formData, configuracao)
        
            // CASO O ARQUIVO SELECIONADO SEJA ACEITO PELO COLARE, O IDENTIFICADOR GERADO É AGREGADO AO OBJETO DE SOLICITAÇÃO
            .then((response) => $scope.solicitacao.idDocumentoPDF = response.data.arquivo)
            
            // CASO O ARQUIVO SELECIONADO SEJA REJEITADO, A MENSAGEM É EXIBIDA AO USUÁRIO
            .catch((response) => BootBoxService.alert(response.data.message));
    };

    $scope.adicionarFuncao = () => {

        try {

            Exceptions.throwIf(!$scope.funcao.nome, 'É necessário informar o nome da função!')

            Exceptions.throwIf(!$scope.funcao.dataInicio, 'É necessário informar a data de início da função!')

            Exceptions.throwIf(!$scope.funcao.dataFinal, 'É necessário informar data final da função!!')

            if (!$scope.solicitacao.funcao) {

                $scope.solicitacao.funcao = [];
            }
            
            $scope.solicitacao.funcao.push($scope.funcao);

            $scope.funcao = {};

        } catch (e) {

            BootBoxService.alert(e.message)
        }
    }

    $scope.excluirFuncao = (funcao) => {

        BootBoxService.confirm(`Deseja excluir a função ${funcao.nome}?`)

            .then(() => {

                $scope.$apply(() => {

                    let index = $scope.solicitacao.funcao.indexOf(funcao)

                    $scope.solicitacao.funcao.splice(index, 1)
                })
            })
    }

    $scope.enviar = () => {

        BootBoxService.confirm('DESEJA REALMENTE SALVAR A SOLICITAÇÃO?')

            .then(() => {

                $scope.mensagens = [];

                let endpoint = ENVIRONMENT['URL_ENVIO_LAYOUT']('CCEAD', 'SOLICITACAO', moment().month(), moment().year());
        
                let solicitacao = tratarSolicitacao();
        
                $http.post(endpoint, solicitacao, { headers: { 'Authorization': TokenService.getTokenValue() } })
        
                    .then(tratarEnvioSucesso)
        
                    .catch(tratarRetornoErro);
            })
    }

    $scope.atualizar = () => {

        BootBoxService.confirm('DESEJA REALMENTE SALVAR A SOLICITAÇÃO?')

            .then(() => {

                $scope.mensagens = [];

                let endpoint = ENVIRONMENT['URL_ENVIO_LAYOUT_ID']('CCEAD', 'SOLICITACAO', moment().month(), moment().year(), $scope.solicitacao.idColare);
        
                let solicitacao = tratarSolicitacao();
        
                $http.put(endpoint, solicitacao, { headers: { 'Authorization': TokenService.getTokenValue() } })
        
                    .then(tratarAtualizacaoSucesso)
        
                    .catch(tratarRetornoErro);
            })
    }

    $scope.alterar = (index) => {

        $scope.solicitacao = $scope.solicitacoes[index];
    }

    $scope.excluir = (index) => {

        BootBoxService.confirm('DESEJA REALMENTE EXCLUIR A SOLICITAÇÃO?')

            .then(() => {

                let solicitacao = $scope.solicitacoes[index];

                $scope.mensagens = [];

                let endpoint = ENVIRONMENT['URL_ENVIO_LAYOUT_ID']('CCEAD', 'SOLICITACAO', moment().month(), moment().year(), solicitacao.idColare);

                $http.delete(endpoint, { headers: { 'Authorization': TokenService.getTokenValue() } })

                    .then(tratarExclusaoSucesso)

                    .catch(tratarRetornoErro);
            })
    }

    let tratarExclusaoSucesso = (response) => {

        SolicitacaoRepository.remover(response.data.arquivo.id)

            .then(() => BootBoxService.alert('SOLICITAÇÃO EXCLUÍDA COM SUCESSO!'))

            .then(carregarSolicitacoes)
    }

    let tratarAtualizacaoSucesso = (response) => {

        let retorno = response.data;

        SolicitacaoRepository.atualizar(retornoToSolicitacao(retorno))

            .then(() => BootBoxService.alert('SOLICITAÇÃO ATUALIZADA COM SUCESSO!'))

            .then(iniciarSolicitacao)

            .then(carregarSolicitacoes)
    }

    let tratarEnvioSucesso = (response) => {
        
        let retorno = response.data;

        SolicitacaoRepository.salvar(retornoToSolicitacao(retorno))

            .then(() => BootBoxService.alert('SOLICITAÇÃO CRIADA COM SUCESSO!'))

            .then(iniciarSolicitacao)

            .then(carregarSolicitacoes)
    }

    let retornoToSolicitacao = (retorno) => {

        return {

            idColare: retorno.arquivo.id, 
            
            codTipoSolicitacao: retorno.arquivo.jsonNode.codTipoSolicitacao, 
            
            numeroCpf: retorno.arquivo.jsonNode.numeroCpf, 
            
            cargo: retorno.arquivo.jsonNode.cargo, 
            
            dataAdmissao: retorno.arquivo.jsonNode.dataAdmissao, 
            
            dataRequerimento: retorno.arquivo.jsonNode.dataRequerimento, 
            
            remuneracao: retorno.arquivo.jsonNode.remuneracao, 
            
            idDocumentoPDF: retorno.arquivo.jsonNode.idDocumentoPDF,

            funcao: retorno.arquivo.jsonNode.funcao
        }
    }

    let tratarSolicitacao = () => {

        let solicitacao = Object.assign({}, $scope.solicitacao);

        delete solicitacao.idColare

        delete solicitacao.id

        if (solicitacao.dataAdmissao) {

            solicitacao.dataAdmissao = moment(solicitacao.dataAdmissao).format('YYYY-MM-DD')
        }

        if (solicitacao.dataRequerimento) {

            solicitacao.dataRequerimento = moment(solicitacao.dataRequerimento).format('YYYY-MM-DD')
        }

        (solicitacao.funcao || []).forEach(funcao => {

            funcao.dataInicio = moment(funcao.dataInicio).format('YYYY-MM-DD')

            funcao.dataFinal = moment(funcao.dataFinal).format('YYYY-MM-DD')

            delete funcao.id

            delete funcao.idSolicitacao
        })

        return solicitacao;
    }

    let tratarRetornoErro = (response) => {

        if (response.status != -1) {

            let retorno = response.data;

            if (Array.isArray(retorno)) {
            
                $scope.mensagens = retorno.map((validacao) => validacao.message);

            } else if (retorno.message) {

                BootBoxService.alert(response.data.message)

            } else {

                $scope.mensagens = retorno.mensagens.erros.map((erro) => erro.mensagem);
            }

        } else {

            BootBoxService.alert('Sem comunicação com a internet!')
        }
    }

    // REALIZA A INICIALIZAÇÃO DA TELA, OBTENDO, CASO PRECISO, O TOKEN DE ENVIO DE DADOS NO PASSAPORTE
    inicializarTela();
};

app.controller('SolicitacaoControlador', ['$scope', '$http', 'TokenService', 'SolicitacaoRepository', SolicitacaoControlador]);